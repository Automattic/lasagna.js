import Lasagna from "../lib/lasagna";

describe("Jwt", () => {
  const url = "http://unit-test.local";
  const validExpJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTg3NTY2MTM4LCJleHAiOjIyMTg1NTAzNjg4OH0.A1fxARHsTBcjJez9MEDrqm8xC3ypasfAGBTl1A64sD0";
  const validExpAndCxpJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTg3NTY2MTM4LCJleHAiOjIyMTg1NTAzNjg4OH0.A1fxARHsTBcjJez9MEDrqm8xC3ypasfAGBTl1A64sD0";
  const invalidExpJwt =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IndwY29tLTIwMjAtMDQtMTAifQ.eyJzdWIiOiJ3aGF0ZXZlcjp0aGluZyIsImlzcyI6IndvcmRwcmVzcy5jb20iLCJpYXQiOjE1OTEzMDA1MjUsImV4cCI6MTU5MTMwMDUzNX0.Wubmpe7vuEUUc5BsSZ5RDirN-tHd0XyRSnV56u_pya8TOAotxBhWD5xOahkZf6siMozN05deIVz-0QQMn87JXRTrUN16OetHuFe9RwIpfRizpeuh_PF7dgIkVyE8BdDGGmp851e4fpgjrAprhCbzpaaABscGeI6vGzO4E2WyQOB2cSNYpcTd8glEFcin5SLhEAnpDqHJuBOdiYzcqmIbBTh4sTMLZjXInYIIALSyCG4IJkOMQhRtbYuw1Qv9aEnMu5VZVUSxmObgPBt2_0HgFk4CWLUvaLUi0jhaP1-bKy2JPTDoybrsVp7cje2tm0IouwZR9JmLdwfaX6kSEBG39g";
  const invalidCxpJwt =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IndwY29tLTIwMjAtMDQtMTAifQ.eyJzdWIiOiJ3aGF0ZXZlcjp0aGluZyIsImN4cCI6MTAwMCwiaXNzIjoid29yZHByZXNzLmNvbSIsImlhdCI6MTU5MTMwMDcyMiwiZXhwIjozMDkyNTc1NjgxN30.uxt0u38gjZaLb80o9WPCSzNAUQ55CLasIljrIf49a-8FohGe-ZecLloLapcG1-iOTXgsGSnyevr77JbIX62rKXJpuGaGdBbXCheYMb6waYplx289E5yip6bWTy6L81imqS6L0Jtzyys-9w6t6QbvVdODz3lYrNAEYx0l2dw_wWE1yUA5czFmaaF8RL4spxcwAY0j2IEHhu7UH_AYrnfbB6kXtLKyveczLLCmdOCAuP6NsWej-3fLzFsNpnc7hMXnARqRhI1jrt_mdD3mt5XqpmqfAakKttt13ZJtSGZjqFNGeDtO5YS2-g8c-S4fKL3HT1WEdb-R4SfjHVGCvRdiaA";
  const invalidExpAndCxpJwt =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IndwY29tLTIwMjAtMDQtMTAifQ.eyJzdWIiOiJ3aGF0ZXZlcjp0aGluZyIsImN4cCI6MTAwMCwiaXNzIjoid29yZHByZXNzLmNvbSIsImlhdCI6MTU5MTMwMDU3NSwiZXhwIjoxNTkxMzAwNTg1fQ.TGvUMuaFicLma9LGEF_kTe-OJCLq6d_K9Zl3kkyTm9NcFFFCctvPqQie07gnJcnqtwxR4itR1ZLQ3TKuP84FKDUGdtk3i-1TFDnQI0ZyQLO7yoKegORLMO0rZ9uXv7kqgzfBd1EXqYX_G0HVhSmwRuwvLDa1R3pGq6-GWlNvcCEfMOIgGH6HMSb5jIkmCR9lKyZOcPSn_jcI937meT2Wtetpb0myjtT5OJUmP_tAM1JkksokottUZZsx-iYkEOu_UWZXyGlJGSEqW40-KmCZqoipedkNKJCR8KQlViAwlMNLtjgxzFqd2Cb03D9QOgpuiD8q4LwP54Ynb_H6-zIVEw";
  const lasagna: Lasagna = new Lasagna(() => Promise.resolve(""), url);

  test("isInvalidJwt/1 with valid exp jwt", () => {
    expect(lasagna.isInvalidJwt(validExpJwt)).toBe(false);
  });

  test("isInvalidJwt/1 with valid exp and cxp jwt", () => {
    expect(lasagna.isInvalidJwt(validExpAndCxpJwt)).toBe(false);
  });

  test("isInvalidJwt/1 with expired exp", () => {
    expect(lasagna.isInvalidJwt(invalidExpJwt)).toBe(true);
  });

  test("isInvalidJwt/1 with expired cxp", () => {
    expect(lasagna.isInvalidJwt(invalidCxpJwt)).toBe(true);
  });

  test("isInvalidJwt/1 with expired exp and cxp", () => {
    expect(lasagna.isInvalidJwt(invalidExpAndCxpJwt)).toBe(true);
  });

  test("isInvalidJwt/1 with falsy stuff", () => {
    expect(lasagna.isInvalidJwt(undefined)).toBe(true);
    expect(lasagna.isInvalidJwt(null)).toBe(true);
    expect(lasagna.isInvalidJwt([])).toBe(true);
    expect(lasagna.isInvalidJwt("")).toBe(true);
    expect(lasagna.isInvalidJwt(0)).toBe(true);
  });

  test("isInvalidJwt/1 with invalid string", () => {
    expect(lasagna.isInvalidJwt("some junky string")).toBe(true);
  });
});
