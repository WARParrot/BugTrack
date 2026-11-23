using BugTrack.Models.Enums;

namespace BugTrack.Models;

public class Attachment : Entity
{
    private Attachment() { } // EF Core

    public Attachment(User uploader, AttachmentType type, string url)
    {
        UploadedBy = uploader ?? throw new ArgumentNullException(nameof(uploader));
        Guard.DefinedEnum(type, "Неизвестный тип вложения");
        Type = type;
        Url = (url ?? string.Empty).Trim();
        Guard.Ensure(UrlRules.IsPlainHttp(Url), "Укажите HTTP(S) URL вложения без пароля");
        UploadedAt = DateTime.UtcNow;
    }

    /// <summary>Diagram association role: 'uploadedBy'.</summary>
    public User UploadedBy { get; private set; } = null!;
    public AttachmentType Type { get; private set; }
    public string Url { get; private set; } = null!;
    public DateTime UploadedAt { get; private set; }
}
