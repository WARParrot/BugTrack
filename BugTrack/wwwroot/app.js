
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Нет связи с сервером");
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Ошибка ${res.status}`);
  return data;
}

export async function currentUser() {
  try {
    return (await api("/auth/me")).user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) location.replace("/login.html");
  return user;
}

export async function redirectIfSignedIn() {
  try {
    if (await currentUser()) location.replace("/projects.html");
  } catch {
  }
}

export function showError(alertEl, message) {
  alertEl.textContent = message;
  alertEl.hidden = false;
}

export function bindForm(form, handler) {
  const alertEl = form.querySelector(".alert");
  const button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertEl.hidden = true;
    button.disabled = true;
    try {
      await handler(Object.fromEntries(new FormData(form)));
    } catch (e) {
      showError(alertEl, e instanceof ApiError ? e.message : "Что-то пошло не так");
      button.disabled = false;
    }
  });
}

export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
  }
  location.replace("/login.html");
}

export const ROLE_LABELS = {
  PROJECT_MANAGER: "Менеджер",
  DEVELOPER: "Разработчик",
  TESTER: "Тестировщик",
  ADMIN: "Администратор",
};

export function initials(fullName) {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export async function initProjectPage() {
  const me = await requireUser();
  if (!me) return null;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    location.replace("/projects.html");
    return null;
  }

  let project;
  try {
    project = await api(`/projects/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) location.replace("/login.html");
    else location.replace("/projects.html");
    return null;
  }

  const role = project.members.find((m) => m.user.id === me.id)?.role;

  for (const el of document.querySelectorAll(".avatar")) el.textContent = initials(me.fullName);
  for (const el of document.querySelectorAll(".proj-pill")) {
    el.textContent = project.name;
    el.hidden = false;
  }
  for (const el of document.querySelectorAll(".role-chip")) {
    el.textContent = ROLE_LABELS[role] ?? "";
    el.hidden = !role;
  }
  for (const a of document.querySelectorAll("[data-project-tab]")) {
    a.href = `${a.dataset.projectTab}?id=${id}`;
  }

  return { me, project, role };
}
