# Buzzer Webapp — Foundation Stage 3

Responsive sports-community webapp prototype with a Node.js/Express backend and MongoDB (Mongoose).

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
3. Run `npm install`.
4. Run `npm start` (or `npm run dev`).
5. Visit `http://localhost:3000`.

The frontend prototype remains in `public/`. Backend code is organized into `config`, `middleware`, `models`, `routes`, `services`, and `utils`.


## API endpoints

### Auth
- `POST /api/auth/register` — body: `{ username, displayName, email, password }`; username 3–24 chars, letters/numbers/underscore, password 8+ characters.
- `POST /api/auth/login` — body: `{ email, password }`.
- `GET /api/auth/me` — requires `Authorization: Bearer <token>`.

### Profile (requires bearer token except public lookup)
- `GET /api/profile/me` — signed-in profile and follower/following counts.
- `PATCH /api/profile/me` — updates only displayName, bio, avatarUrl, coverUrl, avatarSettings.
- `GET /api/profile/:username` — public profile, counts and whether current viewer follows it.
- `POST /api/profile/:username/follow` — follow user.
- `DELETE /api/profile/:username/follow` — unfollow user.

## Authentication token
Tokens currently expire after 7 days. Store tokens carefully on a real client; for production web use, consider secure HttpOnly cookie sessions and refresh-token rotation instead of persistent localStorage.

## Video permission
The User model has `canUploadVideo()` which returns true for verified users or Premium users with active subscription. Video storage, transcoding, billing and moderation workflows are not yet connected.

## Development status
This is a foundation increment, not production-ready. Before launch, add robust request validation, refresh/logout token revocation, email verification, password reset, CSRF protections if cookie auth is used, moderation, audit logs, upload storage, payment provider webhooks, tests and deployment secrets management.


## Stage 4 UI: Authentication + Buzzer brand colors
- Register and login modal forms connect to `/api/auth/register` and `/api/auth/login`.
- JWT token is saved in localStorage for this prototype; production should use secure HttpOnly cookies.
- Color system updated to near-black/white, green primary, and small yellow highlights.
- If the API is not running or MongoDB is not connected, the forms will show an error instead of pretending success.
