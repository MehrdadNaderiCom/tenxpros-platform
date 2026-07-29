export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: Record<string, string | number | boolean | null>;
};

export const INITIAL_ACTION_STATE: ActionState = { status: "idle" };

export function validationError(
  message: string,
  fieldErrors?: ActionState["fieldErrors"],
): ActionState {
  return { status: "error", message, fieldErrors };
}

export function actionError(message: string): ActionState {
  return { status: "error", message };
}

export function actionSuccess(
  message: string,
  data?: ActionState["data"],
): ActionState {
  return { status: "success", message, data };
}
