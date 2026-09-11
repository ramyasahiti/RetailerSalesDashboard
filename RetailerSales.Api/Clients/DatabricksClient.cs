using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using RetailerSales.Api.Configuration;

namespace RetailerSales.Api.Clients;

public class DatabricksClient
{
    private readonly HttpClient _httpClient;
    private readonly DatabricksSettings _settings;

    public DatabricksClient(
        HttpClient httpClient,
        IOptions<DatabricksSettings> options)
    {
        _httpClient = httpClient;
        _settings = options.Value;
    }

    public async Task<string> RunJobAsync(
        string geography,
        string dateFrom,
        string dateTo,
        string requestId)
    {
        var url =
            $"{_settings.WorkspaceUrl}/api/2.1/jobs/run-now";

        var request = new
        {
            job_id = long.Parse(_settings.JobId),

            notebook_params = new
            {
                geography = geography,
                dateFrom = dateFrom,
                dateTo = dateTo,
                requestId = requestId
            }
        };

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            url);

        httpRequest.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                _settings.AccessToken);

        httpRequest.Content = JsonContent.Create(request);

        var response = await _httpClient.SendAsync(httpRequest);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> GetRunStatusAsync(long runId)
    {
        var url =
            $"{_settings.WorkspaceUrl}/api/2.1/jobs/runs/get?run_id={runId}";

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Get,
            url);

        httpRequest.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                _settings.AccessToken);

        var response = await _httpClient.SendAsync(httpRequest);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> GetRunOutputAsync(long runId)
    {
        var url =
            $"{_settings.WorkspaceUrl}/api/2.1/jobs/runs/get-output?run_id={runId}";

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Get,
            url);

        httpRequest.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                _settings.AccessToken);

        var response = await _httpClient.SendAsync(httpRequest);

        var responseBody =
            await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception(
                $"Databricks get-output failed ({(int)response.StatusCode}): {responseBody}");
        }

        return responseBody;
    }
}