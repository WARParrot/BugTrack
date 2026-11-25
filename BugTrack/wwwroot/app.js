
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
