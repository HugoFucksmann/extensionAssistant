import { useReducer } from "react";

const loadingReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_INITIALIZED":
      return { ...state, isInitialized: action.payload };
    case "RESET":
      return { isLoading: false, isInitialized: true };
    default:
      return state;
  }
};

export const useLoading = () => {
  const [loadingState, dispatchLoading] = useReducer(loadingReducer, {
    isLoading: false,
    isInitialized: false,
  });

  const setLoading = (isLoading) => {
    dispatchLoading({ type: "SET_LOADING", payload: isLoading });
  };

  const setInitialized = (isInitialized) => {
    dispatchLoading({ type: "SET_INITIALIZED", payload: isInitialized });
  };

  const resetLoading = () => {
    dispatchLoading({ type: "RESET" });
  };

  return {
    loadingState,
    setLoading,
    setInitialized,
    resetLoading,
  };
};