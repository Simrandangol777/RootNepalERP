import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import Notifications from "./Notifications";
import { renderWithRouter } from "../test/renderWithRouter";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}));

vi.mock("../api/axios", () => ({
  default: mockApi,
}));

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe("Notifications page", () => {
  test("loads restock suggestions and filters by severity", async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValueOnce({
      data: {
        summaryData: {},
        restockSuggestions: [
          {
            product: "Tibetan Incense",
            currentStock: 1,
            reorderLevel: 5,
            predictedDemand: 12,
            suggestedQty: 11,
            priority: "High",
            leadTime: "7 days",
          },
          {
            product: "Singing Bowl",
            currentStock: 7,
            reorderLevel: 5,
            predictedDemand: 9,
            suggestedQty: 2,
            priority: "Low",
            leadTime: "7 days",
          },
        ],
      },
    });

    renderWithRouter(<Notifications />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("reports/dashboard/", {
        params: { date_range: "all_time" },
      });
    });

    expect(await screen.findByText("Tibetan Incense")).toBeInTheDocument();
    expect(screen.getByText("Singing Bowl")).toBeInTheDocument();
    expect(screen.getByText(/total active notifications/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /critical restock pressure/i }));

    expect(screen.getByText("Tibetan Incense")).toBeInTheDocument();
    expect(screen.queryByText("Singing Bowl")).not.toBeInTheDocument();
  });
});
