import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import dotenv from "dotenv";
import { db } from "./firebase.js";

dotenv.config();

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:3000/api/auth/github/callback",
      scope: ["user:email", "repo"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails?.[0]?.value || `${profile.username}@github.com`;
        const fullname = profile.displayName || profile.username;
        const githubId = profile.id;
        const avatarUrl = profile.photos?.[0]?.value;

        // Check if user exists
        let userSnapshot = await db
          .collection("users")
          .where("githubId", "==", githubId)
          .get();

        let userData;

        if (userSnapshot.empty) {
          // Check by email if githubId doesn't exist
          userSnapshot = await db
            .collection("users")
            .where("email", "==", email)
            .get();

          if (userSnapshot.empty) {
            // Create new user
            const newUser = await db.collection("users").add({
              email,
              fullname,
              githubId,
              avatarUrl,
              githubAccessToken: accessToken,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            userData = { id: newUser.id, email, fullname, avatarUrl };
          } else {
            // Update existing user with githubId
            const userDoc = userSnapshot.docs[0];
            await userDoc.ref.update({
              githubId,
              avatarUrl,
              githubAccessToken: accessToken,
              updatedAt: new Date().toISOString(),
            });
            userData = {
              id: userDoc.id,
              ...userDoc.data(),
              githubId,
              avatarUrl,
              githubAccessToken: accessToken,
            };
          }
        } else {
          const userDoc = userSnapshot.docs[0];
          await userDoc.ref.update({
            githubAccessToken: accessToken,
            updatedAt: new Date().toISOString(),
          });
          userData = {
            id: userDoc.id,
            ...userDoc.data(),
            githubAccessToken: accessToken,
          };
        }

        return done(null, userData);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
