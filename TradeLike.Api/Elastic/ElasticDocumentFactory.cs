using System.Security.Cryptography;
using System.Text;
using TradeLike.Api.Models;

namespace TradeLike.Api.Elastic;

public static class ElasticDocumentFactory
{
    public static ElasticSearchDocument FromCustomer(Customer customer)
    {
        var body = JoinParts(customer.Phone, customer.Email, customer.Address, customer.Notes);

        return new ElasticSearchDocument
        {
            DocumentId = $"customer:{customer.TenantId}:{customer.Id}",
            TenantId = customer.TenantId,
            Type = "customer",
            EntityId = customer.Id,
            Title = customer.Name,
            Subtitle = customer.Email,
            Body = body,
            Keywords = [customer.Phone, customer.Address],
            Url = $"/customers/{customer.Id}",
            Version = Fingerprint(customer.Id, customer.TenantId, customer.Name, body)
        };
    }

    public static ElasticSearchDocument FromJob(Job job)
    {
        var body = JoinParts(job.Customer, job.Phone, job.Address, job.Status, job.Priority, job.Notes);

        return new ElasticSearchDocument
        {
            DocumentId = $"job:{job.TenantId}:{job.Id}",
            TenantId = job.TenantId,
            Type = "job",
            EntityId = job.Id,
            Title = job.JobTitle,
            Subtitle = $"{job.Customer} - {job.Status}",
            Body = body,
            Keywords = [job.Priority, job.Phone, job.Address],
            Url = $"/jobs/{job.Id}",
            SortDate = job.ScheduledDate,
            Version = Fingerprint(job.Id, job.TenantId, job.JobTitle, body, job.ScheduledDate.ToString("O"))
        };
    }

    public static ElasticSearchDocument FromQuote(Quote quote)
    {
        var lineItems = quote.LineItems.Count == 0
            ? string.Empty
            : string.Join(
                ' ',
                quote.LineItems
                    .OrderBy(item => item.Id)
                    .Select(item => $"{item.Type} {item.Description} {item.LineTotal:0.00}"));

        var body = JoinParts(
            quote.CustomerName,
            quote.Description,
            quote.Status,
            quote.Notes,
            quote.Total.ToString("0.00"),
            lineItems);

        return new ElasticSearchDocument
        {
            DocumentId = $"quote:{quote.TenantId}:{quote.Id}",
            TenantId = quote.TenantId,
            Type = "quote",
            EntityId = quote.Id,
            Title = quote.Title,
            Subtitle = $"{quote.CustomerName} - {quote.Status}",
            Body = body,
            Keywords = [quote.CustomerName, quote.Status, quote.Total.ToString("0.00")],
            Url = $"/quotes/{quote.Id}",
            SortDate = quote.CreatedAt,
            Version = Fingerprint(quote.Id, quote.TenantId, quote.Title, body, quote.CreatedAt.ToString("O"))
        };
    }

    public static ElasticSearchResult ToResult(ElasticSearchDocument document, double score)
    {
        return new ElasticSearchResult
        {
            Type = document.Type,
            Id = document.EntityId,
            Title = document.Title,
            Subtitle = document.Subtitle,
            Body = document.Body,
            Url = document.Url,
            SortDate = document.SortDate,
            Score = score
        };
    }

    private static string JoinParts(params string?[] values)
    {
        return string.Join(
            " | ",
            values
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!.Trim()));
    }

    private static string Fingerprint(params object?[] values)
    {
        var canonical = string.Join('\u001f', values.Select(value => value?.ToString() ?? string.Empty));
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(canonical));

        return Convert.ToHexString(hash);
    }
}
