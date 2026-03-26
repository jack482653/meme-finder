export const Clipboard = {
  copy: jest.fn().mockResolvedValue(undefined),
  paste: jest.fn().mockResolvedValue(undefined),
};

export const getPreferenceValues = jest.fn(() => ({
  klipyApiKey: "test-klipy-key",
  giphyApiKey: "test-giphy-key",
  maxResults: "9",
}));

export const showToast = jest.fn().mockResolvedValue({
  style: "animated",
  title: "",
  message: "",
});

export const Toast = {
  Style: {
    Animated: "animated" as const,
    Success: "success" as const,
    Failure: "failure" as const,
  },
};
