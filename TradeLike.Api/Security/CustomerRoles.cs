namespace TradeLike.Api.Security;

public static class CustomerRoles
{
    public const string Director = "CustomerDirector";

    public const string Manager = "CustomerManager";

    public const string Employee = "CustomerEmployee";

    public static readonly string[] EmployeeRoles = [Employee, Manager, Director, "Customer"];

    public static readonly string[] ManagerRoles = [Manager, Director, "Customer"];

    public static readonly string[] DirectorRoles = [Director];

    public static bool IsCustomerRole(string role)
    {
        return EmployeeRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsManagerOrDirector(string? role)
    {
        return role is not null && ManagerRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsDirector(string? role)
    {
        return string.Equals(role, Director, StringComparison.OrdinalIgnoreCase);
    }
}
