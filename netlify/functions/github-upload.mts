const GITHUB_OWNER = "yarajj1";
const GITHUB_REPO = "portfolio";
const GITHUB_BRANCH = "main";
const GITHUB_IMAGE_FOLDER = "images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Firebase web API keys are public identifiers, not secrets — access is controlled by
// Firebase security rules, not by hiding this value. Used here only to confirm the caller
// is holding a session for an already-authenticated admin user.
const FIREBASE_API_KEY = "AIzaSyDepBOMROJ5MrmUYAYpm5dcbWXME8ZB5Fg";

async function isAuthenticatedAdmin(idToken: string): Promise<boolean> {
  if (!idToken) return false;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );

  if (!response.ok) return false;

  const data = await response.json().catch(() => null);
  return Boolean(data?.users?.length);
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const githubToken = Netlify.env.get("GITHUB_TOKEN");
  if (!githubToken) {
    return Response.json(
      { error: "GITHUB_TOKEN is not configured on the server." },
      { status: 500 }
    );
  }

  let payload: { idToken?: string; filename?: string; base64Content?: string };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { idToken, filename, base64Content } = payload;

  if (!(await isAuthenticatedAdmin(idToken ?? ""))) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!filename || !base64Content) {
    return Response.json({ error: "Missing filename or image data." }, { status: 400 });
  }

  const approxBytes = (base64Content.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "That image is over 5MB — resize it before uploading." },
      { status: 400 }
    );
  }

  const path = `${GITHUB_IMAGE_FOLDER}/${filename}`;

  const githubResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add project image: ${filename}`,
        content: base64Content,
        branch: GITHUB_BRANCH
      })
    }
  );

  if (!githubResponse.ok) {
    const errorBody = await githubResponse.json().catch(() => ({}));

    if (githubResponse.status === 404) {
      return Response.json(
        {
          error:
            "GitHub upload failed (404) — the token doesn't have access to this repo. " +
            "Check that the token's Repository access includes this repo and that its " +
            "Contents permission is set to Read and write."
        },
        { status: 502 }
      );
    }
    if (githubResponse.status === 401) {
      return Response.json(
        { error: "GitHub upload failed (401) — the token looks invalid or expired." },
        { status: 502 }
      );
    }

    return Response.json(
      { error: errorBody.message || `GitHub upload failed (${githubResponse.status})` },
      { status: 502 }
    );
  }

  return Response.json({
    url: `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`
  });
};
