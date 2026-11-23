using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class NotificationConfiguration : EntityConfiguration<Notification>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("Notifications");
        b.Property(n => n.Message).IsRequired().HasMaxLength(1000);
        b.HasOne(n => n.Recipient).WithMany().HasForeignKey("RecipientId").IsRequired().OnDelete(DeleteBehavior.Restrict);
    }
}
