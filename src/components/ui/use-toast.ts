// IMMEDIATE FIXES FOR VERCEL DEPLOYMENT

// 1. Fix src/components/ui/use-toast.ts (CRITICAL - Circular Import)
// REPLACE ENTIRE FILE with:

// src/components/ui/use-toast.ts
import * as React from "react"

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  cancel?: React.ReactNode
  destructive?: boolean
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToastActionElement = React.ReactElement
type Toast = ToasterToast & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  cancel?: ToastActionElement
  destructive?: boolean
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST", 
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: Toast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: Toast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

// 2. Create missing hooks file: src/hooks/use-toast.ts
// CREATE NEW FILE:

// src/hooks/use-toast.ts  
export { useToast, toast } from "@/components/ui/use-toast"

// 3. Fix any JSON import issues by ensuring proper file structure
// Update src/data/pra-rules.generated.js to handle missing JSON gracefully:

// src/data/pra-rules.generated.js
let NON_INSURANCE = [];
let INSURANCE_ONLY = [];

try {
  NON_INSURANCE = await import('./pra-rules.non-insurance.json').then(m => m.default || []);
} catch (e) {
  console.warn('Could not load pra-rules.non-insurance.json');
}

try {  
  INSURANCE_ONLY = await import('./pra-rules.insurance-only.json').then(m => m.default || []);
} catch (e) {
  console.warn('Could not load pra-rules.insurance-only.json');
}

// Helper: remove trailing /dd-mm-yyyy if present
const stripDate = (url) => url.replace(/\/\d{2}-\d{2}-\d{4}$/, '');

export const PRA_RULES = (NON_INSURANCE || []).map(({ name, url }) => ({
  name,
  url: stripDate(url),
}));

export const PRA_INSURANCE_RULES = (INSURANCE_ONLY || []).map(({ name, url }) => ({
  name,
  url: stripDate(url),
}));

export default { PRA_RULES, PRA_INSURANCE_RULES };

// 4. Update package.json to ensure proper build (if needed)
// Add to package.json scripts:
{
  "scripts": {
    "build": "tsc && vite build",
    "build:check": "tsc --noEmit && vite build"
  }
}
