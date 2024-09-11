import { API } from "aws-amplify";

const apiName = "public";

export function createInternalInvitation({ email, priority = 0 }) {
  return API.put(
    apiName,
    "/user-admin/invitations",
    {
      body: { email, priority },
    },
    { response: true }
  );
}

export function loadInternalInvitations({ skip, limit } = {}) {
  let url = "/user-admin/invitations";
  if (skip || limit) {
    url = `${url}?skip=${skip}&limit=${limit}`;
  }
  return new Promise((resolve, reject) => {
    API.get(apiName, url, { response: true })
      .then((response) => {
        resolve(response.data.invitations);
      })
      .catch((error) => reject(error));
  });
}

export function loadInternalInvitation({ email }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/user-admin/${email}`, { response: true })
      .then((response) => {
        resolve(response.data.admins);
      })
      .catch((error) => reject(error));
  });
}

export function updateInternalInvitation({ email, status, priority = 0 }) {
  return API.patch(
    apiName,
    `/user-admin/${email}`,
    {
      body: { status, priority },
    },
    { response: true }
  );
}

export function deleteInternalInvitation({ email }) {
  return API.del(apiName, `/user-admin/invitations/${email}`, { response: true });
}

export function loadInternalAdminsList() {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/user-admin", { response: true })
      .then((response) => {
        resolve(response.data.admins);
      })
      .catch((error) => reject(error));
  });
}

export function sendInternalInvitationEmail({ email }) {
  return API.post(apiName, `/user-admin/email/invitation/${email}`, { response: true });
}

export function sendInternalInvitationReminderEmail({ email }) {
  return API.post(apiName, `/user-admin/email/reminder/${email}`, { response: true });
}

export function sendInternalInvitationNudgeEmail({ email }) {
  return API.post(apiName, `/user-admin/email/nudge/${email}`, { response: true });
}

export function sendInternalInvitationOnboardingCompleteEmail({ email }) {
  return API.post(apiName, `/user-admin/email/onboarding-complete/${email}`, { response: true });
}

export function loadInternalAccounts({ skip = 0, limit = 100 } = {}) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/user-admin/accounts?skip=${skip}&limit=${limit}`, { response: true })
      .then((response) => {
        resolve(response.data.accounts);
      })
      .catch((error) => reject(error));
  });
}

export function loadInternalAccountStats({ email }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/user-admin/stats/${email}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function loadInternalGlobalStats() {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/user-admin/stats", { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function loadInternalOnboardingStats() {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/user-admin/onboarding/stats", { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}
