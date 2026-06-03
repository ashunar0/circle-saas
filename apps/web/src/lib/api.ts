import { hc } from "hono/client";
import type { AppType } from "@circle/api";

export const api = hc<AppType>("/");
