using BugTrack.Repositories;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Data;

public static class DataServiceCollectionExtensions
{
    /// <summary>Registers the DbContext (SQLite), repositories, transactions and the database initializer.</summary>
    public static IServiceCollection AddDataAccess(this IServiceCollection services, IConfiguration configuration)
    {
        var databasePath = Path.GetFullPath(configuration["Database:Path"] ?? ".data/bugtrack.sqlite");
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);

        services.AddDbContext<BugTrackDbContext>(options => options.UseSqlite(
            $"Data Source={databasePath};Default Timeout=30",
            sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<ITicketRepository, TicketRepository>();
        services.AddScoped<ITicketEventRepository, TicketEventRepository>();
        services.AddScoped<IReleaseRepository, ReleaseRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();

        services.AddScoped<ITransactions, EfTransactions>();
        services.AddScoped<IDatabaseInitializer, DatabaseInitializer>();
        return services;
    }
}
