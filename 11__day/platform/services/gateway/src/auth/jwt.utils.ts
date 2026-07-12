import * as crypto from "node:crypto";

export interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  exp?: number;
  [key: string]: any;
}

export function verifyJwt(token: string, secretOrPublicKey: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header and payload
  const headerJson = Buffer.from(headerB64, "base64url").toString("utf8");
  const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");

  const header = JSON.parse(headerJson);
  const payload = JSON.parse(payloadJson) as JwtPayload;

  const alg = header.alg;
  if (!alg) {
    throw new Error("Missing algorithm in header");
  }

  // Check expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error("Token has expired");
  }

  // Verify signature
  const data = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(signatureB64, "base64url");

  if (alg.startsWith("HS")) {
    // HMAC signature validation
    const expectedSignature = crypto.createHmac("sha256", secretOrPublicKey).update(data).digest();
    if (!crypto.timingSafeEqual(signature, expectedSignature)) {
      throw new Error("Invalid signature");
    }
  } else if (alg.startsWith("RS") || alg.startsWith("ES")) {
    // RSA/ECDSA signature validation
    const verifier = crypto.createVerify(alg.startsWith("RS") ? "RSA-SHA256" : "SHA256");
    verifier.update(data);

    let key = secretOrPublicKey;
    if (!key.includes("-----BEGIN PUBLIC KEY-----")) {
      const cleaned = key.replace(/\s+/g, "");
      const matched = cleaned.match(/.{1,64}/g);
      if (!matched) {
        throw new Error("Invalid public key format");
      }
      key = `-----BEGIN PUBLIC KEY-----\n${matched.join("\n")}\n-----END PUBLIC KEY-----`;
    }

    const verified = verifier.verify(key, signature);
    if (!verified) {
      throw new Error("Invalid signature");
    }
  } else {
    throw new Error(`Unsupported JWT algorithm: ${alg}`);
  }

  return payload;
}
