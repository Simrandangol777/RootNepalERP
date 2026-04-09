import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import Login from "./Login";
import { renderWithRouter } from "../test/renderWithRouter";

const { mockNavigate, mockApi } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockApi: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("../api/axios", () => ({
  default: mockApi,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login page", () => {
  test("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Login />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "invalid-email");
    await user.type(screen.getByPlaceholderText("••••••••"), "Secret123!");
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form"));

    expect(
      screen.getByText(/email must look like name@gmail.com/i)
    ).toBeInTheDocument();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  test("submits credentials and redirects on success", async () => {
    const user = userEvent.setup();
    mockApi.post.mockResolvedValueOnce({
      data: {
        access: "access-token",
        refresh: "refresh-token",
      },
    });
    mockApi.get.mockResolvedValueOnce({
      data: {
        fullName: "Simran",
        email: "simran@example.com",
      },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "simran@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "Secret123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("auth/login/", {
        email: "simran@example.com",
        password: "Secret123!",
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem("access")).toBe("access-token");
      expect(localStorage.getItem("refresh")).toBe("refresh-token");
      expect(localStorage.getItem("user_name")).toBe("Simran");
      expect(localStorage.getItem("user_email")).toBe("simran@example.com");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });
});
