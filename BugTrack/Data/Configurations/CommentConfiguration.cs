using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class CommentConfiguration : EntityConfiguration<Comment>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Comment> b)
    {
        b.ToTable("Comments");
        b.Property(c => c.Text).IsRequired().HasMaxLength(5000);

        b.HasOne<Ticket>().WithMany(t => t.Comments).HasForeignKey("TicketId").IsRequired().OnDelete(DeleteBehavior.Cascade);
        b.HasOne(c => c.Author).WithMany().HasForeignKey("AuthorId").IsRequired().OnDelete(DeleteBehavior.Restrict);
        b.HasOne(c => c.Parent).WithMany(c => c.Replies).HasForeignKey("ParentId").IsRequired(false).OnDelete(DeleteBehavior.Restrict);
    }
}
