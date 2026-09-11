using Microsoft.AspNetCore.Diagnostics;
using RetailerSales.Api.Clients;
using RetailerSales.Api.Configuration;
using RetailerSales.Api.Data;
using RetailerSales.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add controllers
builder.Services.AddControllers();

// Databricks configuration
builder.Services.Configure<DatabricksSettings>(
    builder.Configuration.GetSection("Databricks"));

// Application services
builder.Services.AddScoped<SalesSummaryService>();
builder.Services.AddScoped<SqliteSalesSummaryRepository>();

// API documentation
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Databricks HTTP client
builder.Services.AddHttpClient<DatabricksClient>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Global exception handling
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode =
            StatusCodes.Status500InternalServerError;

        context.Response.ContentType = "application/json";

        var exceptionFeature =
            context.Features.Get<IExceptionHandlerPathFeature>();

        var logger =
            context.RequestServices.GetRequiredService<ILogger<Program>>();

        if (exceptionFeature?.Error is Exception exception)
        {
            logger.LogError(
                exception,
                "An unhandled exception occurred while processing the request.");
        }

        await context.Response.WriteAsJsonAsync(new
        {
            message = "Unable to process your request. Please try again."
        });
    });
});

// CORS
app.UseCors("AngularPolicy");

// Swagger / OpenAPI
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS
app.UseHttpsRedirection();

// Authorization
app.UseAuthorization();

// Controllers
app.MapControllers();

app.Run();