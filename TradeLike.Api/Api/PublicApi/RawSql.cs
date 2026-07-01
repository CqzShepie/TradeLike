using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TradeLike.Api.Data;

namespace TradeLike.Api.PublicApi;

internal readonly record struct SqlParam(string Name, object? Value);

internal static class RawSql
{
    public static async Task<int> ExecuteAsync(
        TradeLikeDbContext context,
        string sql,
        CancellationToken cancellationToken,
        params SqlParam[] parameters)
    {
        using var command = await CreateCommandAsync(context, sql, cancellationToken, parameters);
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public static async Task<object?> ScalarAsync(
        TradeLikeDbContext context,
        string sql,
        CancellationToken cancellationToken,
        params SqlParam[] parameters)
    {
        using var command = await CreateCommandAsync(context, sql, cancellationToken, parameters);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return value is DBNull ? null : value;
    }

    public static async Task<List<T>> QueryAsync<T>(
        TradeLikeDbContext context,
        string sql,
        Func<DbDataReader, T> map,
        CancellationToken cancellationToken,
        params SqlParam[] parameters)
    {
        using var command = await CreateCommandAsync(context, sql, cancellationToken, parameters);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rows = new List<T>();

        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(map(reader));
        }

        return rows;
    }

    public static string ReadString(DbDataReader reader, string name, string fallback = "")
    {
        var value = reader[name];
        return value is DBNull ? fallback : Convert.ToString(value) ?? fallback;
    }

    public static int ReadInt(DbDataReader reader, string name)
    {
        var value = reader[name];
        return value is DBNull ? 0 : Convert.ToInt32(value);
    }

    public static bool ReadBool(DbDataReader reader, string name)
    {
        var value = reader[name];
        return value is not DBNull && Convert.ToBoolean(value);
    }

    public static DateTime? ReadDateTime(DbDataReader reader, string name)
    {
        var value = reader[name];
        return value is DBNull ? null : Convert.ToDateTime(value);
    }

    private static async Task<DbCommand> CreateCommandAsync(
        TradeLikeDbContext context,
        string sql,
        CancellationToken cancellationToken,
        params SqlParam[] parameters)
    {
        var connection = context.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        var command = connection.CreateCommand();
        command.CommandText = sql;

        var transaction = context.Database.CurrentTransaction?.GetDbTransaction();
        if (transaction is not null)
        {
            command.Transaction = transaction;
        }

        foreach (var parameterValue in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = parameterValue.Name;
            parameter.Value = parameterValue.Value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        return command;
    }
}
