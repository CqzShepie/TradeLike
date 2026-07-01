namespace TradeLike.Api.Security;

public static class CustomerRoles
{
    public const string Director = "CustomerDirector";

    public const string Manager = "CustomerManager";

    public const string Employee = "CustomerEmployee";

    public const string Staff = "Staff";

    public const string LegacyCustomer = "Customer";

    public const string LegacyDirector = "Director";

    public static readonly string[] EmployeeRoles = [Employee, Manager, Director, LegacyCustomer, LegacyDirector];

    public static readonly string[] ManagerRoles = [Manager, Director, LegacyCustomer, LegacyDirector];

    public static readonly string[] DirectorRoles = [Director, LegacyCustomer, LegacyDirector];

    public static string Normalize(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return Employee;
        }

        var cleaned = role.Trim();

        if (string.Equals(cleaned, LegacyDirector, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(cleaned, LegacyCustomer, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(cleaned, Director, StringComparison.OrdinalIgnoreCase))
        {
            return Director;
        }

        if (string.Equals(cleaned, Manager, StringComparison.OrdinalIgnoreCase))
        {
            return Manager;
        }

        if (string.Equals(cleaned, Employee, StringComparison.OrdinalIgnoreCase))
        {
            return Employee;
        }

        if (string.Equals(cleaned, Staff, StringComparison.OrdinalIgnoreCase))
        {
            return Staff;
        }

        return cleaned;
    }

    public static bool IsCustomerRole(string role)
    {
        return EmployeeRoles.Contains(role, StringComparer.OrdinalIgnoreCase) ||
            EmployeeRoles.Contains(Normalize(role), StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsManagerOrDirector(string? role)
    {
        return role is not null && ManagerRoles.Contains(Normalize(role), StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsDirector(string? role)
    {
        return string.Equals(Normalize(role), Director, StringComparison.OrdinalIgnoreCase);
    }
}
