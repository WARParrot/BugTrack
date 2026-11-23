using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public sealed class UserRepository : EfRepository<User>, IUserRepository
{
    public UserRepository(BugTrackDbContext db) : base(db) { }

    protected override IQueryable<User> Query => Db.Users;

    public async Task<User?> FindByEmailAsync(Email email, CancellationToken ct = default) =>
        await Db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
}
