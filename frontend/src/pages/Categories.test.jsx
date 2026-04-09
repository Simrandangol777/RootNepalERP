import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import Categories from "./Categories";
import { renderWithRouter } from "../test/renderWithRouter";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../api/axios", () => ({
  default: mockApi,
}));

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe("Categories page", () => {
  test("loads and displays categories from the API", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        {
          id: 2,
          name: "Singing Bowls",
          description: "Healing instruments",
          status: "Active",
          product_count: 4,
          updated_at: "2026-04-08T00:00:00Z",
          updatedBy: "admin",
        },
      ],
    });

    renderWithRouter(<Categories />);

    expect(screen.getByText("Categories")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("categories/");
    });

    expect(await screen.findByText("Singing Bowls")).toBeInTheDocument();
    expect(screen.getByText("Healing instruments")).toBeInTheDocument();
  });
});
