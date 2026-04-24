import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  const isAtlas = uri.includes("mongodb+srv://") || uri.includes(".mongodb.net");
  const serverSelectionTimeoutMS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000);
  const allowInvalidCerts = process.env.MONGO_TLS_ALLOW_INVALID_CERTS === "true";

  const options = {
    serverSelectionTimeoutMS,
  };

  if (isAtlas) {
    options.tls = true;
  }

  if (allowInvalidCerts) {
    options.tlsAllowInvalidCertificates = true;
  }

  try {
    await mongoose.connect(uri, options);
    console.log("MongoDB connected");
  } catch (err) {
    const message = String(err?.message || "");
    const isTlsIssue =
      message.includes("ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR") || message.includes("tlsv1 alert internal error");

    if (isAtlas) {
      console.error("MongoDB Atlas connection failed.");
      console.error("- Ensure your current public IP is added in Atlas Network Access.");
      console.error("- Ensure the Atlas user/password in MONGODB_URI are correct.");
      console.error("- If you are on Node 24, try Node 20 LTS (Atlas TLS handshakes can fail in some local environments).");
      if (isTlsIssue) {
        console.error("- TLS handshake failed. Check VPN/proxy/antivirus SSL inspection and corporate network policies.");
      }
    }

    throw err;
  }
}
