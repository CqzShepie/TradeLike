using System.Text;

namespace TradeLike.Api.Api.Documents;

public sealed class PdfRenderService
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public PdfRenderService(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
    }

    public async Task<string> RenderHtmlToPdfAsync(
        string html,
        int tenantId,
        string fileStem,
        CancellationToken cancellationToken)
    {
        var tempRoot = GetConfiguredDirectory("PDF_TEMP_DIR")
            ?? Path.Combine(Path.GetTempPath(), "tradelike-pdf");
        Directory.CreateDirectory(tempRoot);

        var tempPath = Path.Combine(tempRoot, $"{fileStem}.pdf");
        await File.WriteAllBytesAsync(tempPath, BuildSimplePdf(html), cancellationToken);

        var storageRoot = GetConfiguredDirectory("PDF_STORAGE_BUCKET")
            ?? Path.Combine(_environment.ContentRootPath, "App_Data", "pdf");
        var tenantRoot = Path.Combine(storageRoot, tenantId.ToString());
        Directory.CreateDirectory(tenantRoot);

        var storedPath = Path.Combine(tenantRoot, $"{fileStem}.pdf");
        File.Copy(tempPath, storedPath, overwrite: true);
        return storedPath;
    }

    private string? GetConfiguredDirectory(string key)
    {
        var configured = _configuration[key] ?? Environment.GetEnvironmentVariable(key);
        return string.IsNullOrWhiteSpace(configured) ? null : configured;
    }

    private static byte[] BuildSimplePdf(string html)
    {
        var plainText = StripHtml(html)
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal);
        var lines = Wrap(plainText, 86).Take(42).ToArray();
        var content = new StringBuilder("BT /F1 11 Tf 50 790 Td 14 TL ");
        foreach (var line in lines)
        {
            content.Append('(').Append(line).Append(") Tj T* ");
        }

        content.Append("ET");
        var stream = content.ToString();
        var objects = new[]
        {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            $"<< /Length {Encoding.ASCII.GetByteCount(stream)} >>\nstream\n{stream}\nendstream"
        };

        var pdf = new StringBuilder("%PDF-1.4\n");
        var offsets = new List<int> { 0 };
        foreach (var item in objects.Select((value, index) => new { value, index }))
        {
            offsets.Add(Encoding.ASCII.GetByteCount(pdf.ToString()));
            pdf.Append(item.index + 1).Append(" 0 obj\n").Append(item.value).Append("\nendobj\n");
        }

        var xref = Encoding.ASCII.GetByteCount(pdf.ToString());
        pdf.Append("xref\n0 6\n0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1))
        {
            pdf.Append(offset.ToString("D10")).Append(" 00000 n \n");
        }

        pdf.Append("trailer << /Size 6 /Root 1 0 R >>\nstartxref\n")
            .Append(xref)
            .Append("\n%%EOF");
        return Encoding.ASCII.GetBytes(pdf.ToString());
    }

    private static string StripHtml(string html)
    {
        var text = System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ");
        return System.Net.WebUtility.HtmlDecode(text).ReplaceLineEndings(" ");
    }

    private static IEnumerable<string> Wrap(string value, int width)
    {
        var words = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var line = new StringBuilder();
        foreach (var word in words)
        {
            if (line.Length + word.Length + 1 > width)
            {
                yield return line.ToString();
                line.Clear();
            }

            if (line.Length > 0)
            {
                line.Append(' ');
            }

            line.Append(word);
        }

        if (line.Length > 0)
        {
            yield return line.ToString();
        }
    }
}
