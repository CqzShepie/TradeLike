namespace TradeLike.Api.Security;

public static class CustomerRoles
{
    public const string Director = "CustomerDirector";

    public const string Manager = "CustomerManager";

    public const string Employee = "CustomerEmployee";

    public const string Staff = "Staff";

    public const string LegacyCustomer = "Customer";

    public const string LegacyDirector = "Director";

    public const string Admin = "Admin";

    public const string Support = "Support";

    public const string JuniorDeveloper = "Junior Developer";

    public const string Developer = "Developer";

    public const string SeniorDeveloper = "Senior Developer";

    public const string Marketing = "Marketing";

    public const string CustomerService = "Customer Service";

    public const string OperationsCoordinator = "Operations Coordinator";

    public const string PersonalAssistant = "Personal Assistant";

    public static readonly string[] EmployeeRoles = [Employee, Manager, Director];

    public static readonly string[] ManagerRoles = [Manager, Director];

    public static readonly string[] DirectorRoles = [Director];

    public static readonly string[] StudioRoles =
    [
        LegacyDirector,
        Admin,
        Support,
        JuniorDeveloper,
        Developer,
        SeniorDeveloper,
        Marketing,
        CustomerService,
        OperationsCoordinator,
        PersonalAssistant,
        Staff
    ];

    public static string Normalize(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return Employee;
        }

        var cleaned = role.Trim();

        foreach (var knownRole in EmployeeRoles.Concat(StudioRoles).Append(LegacyCustomer))
        {
            if (string.Equals(cleaned, knownRole, StringComparison.OrdinalIgnoreCase))
            {
                return knownRole;
            }
        }

        return cleaned;
    }

    public static bool IsCustomerRole(string role)
    {
        return EmployeeRoles.Contains(Normalize(role), StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsManagerOrDirector(string? role)
    {
        return role is not null && ManagerRoles.Contains(Normalize(role), StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsDirector(string? role)
    {
        return string.Equals(Normalize(role), Director, StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsStudioRole(string? role)
    {
        return role is not null &&
            StudioRoles.Contains(Normalize(role), StringComparer.OrdinalIgnoreCase);
    }
}
