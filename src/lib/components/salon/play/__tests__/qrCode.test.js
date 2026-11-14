import { describe, it, expect } from "vitest";
import { codeFromQr } from "../qrCode.js";

describe("code lu dans le QR de la TV", () => {
  it("lit le code dans l'URL de la TV", () => {
    expect(codeFromQr("https://www.zik-music.fr/salon/play?code=ab12cd")).toBe(
      "AB12CD",
    );
  });

  it("accepte le code seul", () => {
    expect(codeFromQr(" xyz789 ")).toBe("XYZ789");
  });

  it("refuse un QR qui n'est pas une soirée", () => {
    expect(codeFromQr("https://exemple.fr/menu")).toBeNull();
    expect(codeFromQr("https://exemple.fr/?code=<script>")).toBeNull();
    expect(codeFromQr("WIFI:S:bar;T:WPA;P:secret;;")).toBeNull();
    expect(codeFromQr("")).toBeNull();
    expect(codeFromQr(null)).toBeNull();
  });
});
