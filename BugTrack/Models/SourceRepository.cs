namespace BugTrack.Models;

public class SourceRepository : Entity
{
    private SourceRepository() { }

    public SourceRepository(string name, string url)
    {
        Name = Guard.Text(name, "Название репозитория", 150);
        Url = (url ?? string.Empty).Trim();
        Guard.Ensure(UrlRules.IsRepositoryUrl(Url), "Укажите HTTPS или SSH URL репозитория без пароля");
    }

    public string Name { get; private set; } = null!;
    public string Url { get; private set; } = null!;

    internal void CopyFrom(SourceRepository other)
    {
        Name = other.Name;
        Url = other.Url;
    }
}
