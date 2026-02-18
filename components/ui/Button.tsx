import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants: Record<string, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  ghost: "hover:bg-gray-100 text-gray-600",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  outline: "border border-gray-300 hover:bg-gray-50 text-gray-700 bg-white",
};

const sizes: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs font-medium rounded-md",
  md: "px-3.5 py-2 text-sm font-medium rounded-lg",
  lg: "px-5 py-2.5 text-sm font-semibold rounded-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
