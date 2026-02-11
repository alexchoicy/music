using System.Collections.Immutable;
using System.Text;

namespace Music.Core.Utils;

public static class StringUtils
{
    public static string NormalizeString(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "";

        string s = input.Normalize(NormalizationForm.FormKC);

        s = s.ToUpperInvariant();

        StringBuilder sb = new StringBuilder(s.Length);
        foreach (var r in s.EnumerateRunes())
        {
            if (Rune.IsLetterOrDigit(r))
            {
                sb.Append(r.ToString());
            }
        }

        return sb.ToString().Trim();
    }

}

