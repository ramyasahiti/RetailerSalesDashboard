using System.ComponentModel.DataAnnotations;

namespace RetailerSales.Api.Models
{
    public class SalesSummaryRequest : IValidatableObject
    {
        public string Geography { get; set; } = string.Empty;

        public DateTime? DateFrom { get; set; }

        public DateTime? DateTo { get; set; }

        public IEnumerable<ValidationResult> Validate(
            ValidationContext validationContext)
        {
            // End date cannot be earlier than start date
            if (DateFrom.HasValue &&
                DateTo.HasValue &&
                DateTo.Value.Date < DateFrom.Value.Date)
            {
                yield return new ValidationResult(
                    "The end date cannot be earlier than the start date.",
                    new[] { nameof(DateTo) }
                );
            }

            // If start date is today, end date cannot be in the future
            if (DateFrom.HasValue &&
                DateTo.HasValue &&
                DateFrom.Value.Date == DateTime.Today &&
                DateTo.Value.Date > DateTime.Today)
            {
                yield return new ValidationResult(
                    "When the start date is today, the end date cannot be a future date.",
                    new[] { nameof(DateTo) }
                );
            }
        }
    }
}
