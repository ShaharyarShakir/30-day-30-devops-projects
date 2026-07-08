import { Hono } from "hono";
import QRCode from "qrcode";

const qrRouter = new Hono();

// GET / - Generates QR code image stream or Data URL based on query param data
qrRouter.get("/", async (c) => {
  const data = c.req.query("data");
  const format = c.req.query("format") || "png"; // "png" | "dataurl"

  if (!data) {
    return c.json({ success: false, error: "data query parameter is required." }, 400);
  }

  try {
    if (format === "dataurl") {
      const dataUrl = await QRCode.toDataURL(data);
      return c.json({ success: true, data: dataUrl });
    } else {
      const buffer = await QRCode.toBuffer(data, { type: "png", margin: 2 });
      c.header("Content-Type", "image/png");
      c.header("Cache-Control", "public, max-age=31536000"); // cacheable
      return c.body(buffer);
    }
  } catch (error: any) {
    console.error("[QR Router] Error generating QR code:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default qrRouter;
