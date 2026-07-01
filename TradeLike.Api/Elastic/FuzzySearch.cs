using System.Text;

namespace TradeLike.Api.Elastic;

public static class FuzzySearch
{
    public static double Score(ElasticSearchDocument document, string query)
    {
        var queryTokens = Tokenize(query).ToArray();
        if (queryTokens.Length == 0)
        {
            return 0;
        }

        var documentTokens = Tokenize(document.SearchText).ToArray();
        if (documentTokens.Length == 0)
        {
            return 0;
        }

        var score = 0d;

        foreach (var queryToken in queryTokens)
        {
            var bestMatch = documentTokens
                .Select(documentToken => Similarity(queryToken, documentToken))
                .DefaultIfEmpty(0)
                .Max();

            if (bestMatch <= 0)
            {
                return 0;
            }

            score += bestMatch;
        }

        var titleBoost = queryTokens.Any(token =>
            document.Title.Contains(token, StringComparison.OrdinalIgnoreCase))
            ? 0.35
            : 0;

        return score / queryTokens.Length + titleBoost;
    }

    private static IEnumerable<string> Tokenize(string value)
    {
        var token = new StringBuilder();

        foreach (var character in value)
        {
            if (char.IsLetterOrDigit(character))
            {
                token.Append(char.ToLowerInvariant(character));
                continue;
            }

            if (token.Length > 0)
            {
                yield return token.ToString();
                token.Clear();
            }
        }

        if (token.Length > 0)
        {
            yield return token.ToString();
        }
    }

    private static double Similarity(string queryToken, string documentToken)
    {
        if (documentToken == queryToken)
        {
            return 1;
        }

        if (documentToken.Contains(queryToken, StringComparison.Ordinal) ||
            queryToken.Contains(documentToken, StringComparison.Ordinal))
        {
            return 0.9;
        }

        var allowedDistance = queryToken.Length <= 4 ? 1 : 2;
        var distance = EditDistanceAtMost(queryToken, documentToken, allowedDistance);

        if (distance < 0)
        {
            return 0;
        }

        return distance == 1 ? 0.72 : 0.55;
    }

    private static int EditDistanceAtMost(string left, string right, int maxDistance)
    {
        if (Math.Abs(left.Length - right.Length) > maxDistance)
        {
            return -1;
        }

        var previous = new int[right.Length + 1];
        var current = new int[right.Length + 1];

        for (var index = 0; index <= right.Length; index++)
        {
            previous[index] = index;
        }

        for (var leftIndex = 1; leftIndex <= left.Length; leftIndex++)
        {
            current[0] = leftIndex;
            var rowMin = current[0];

            for (var rightIndex = 1; rightIndex <= right.Length; rightIndex++)
            {
                var cost = left[leftIndex - 1] == right[rightIndex - 1] ? 0 : 1;

                current[rightIndex] = Math.Min(
                    Math.Min(current[rightIndex - 1] + 1, previous[rightIndex] + 1),
                    previous[rightIndex - 1] + cost);

                rowMin = Math.Min(rowMin, current[rightIndex]);
            }

            if (rowMin > maxDistance)
            {
                return -1;
            }

            (previous, current) = (current, previous);
        }

        return previous[right.Length] <= maxDistance ? previous[right.Length] : -1;
    }
}
