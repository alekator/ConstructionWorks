import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/work-types")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "wt1", name: "Монтаж опалубки" }]), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders heading and loads initial data", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Журнал работ" })).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(await screen.findByText("Монтаж опалубки")).toBeTruthy();
  });
});