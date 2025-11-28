/**
 * Premium UI Component Library
 *
 * Central export file for all premium UI components.
 * Import components from here for cleaner code.
 *
 * @example
 * import { Button, Card, Badge } from "@/components/ui";
 */

export { Button } from "./Button";
export type { ButtonProps } from "./Button";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
export type { CardProps, CardHeaderProps, CardTitleProps, CardFooterProps } from "./Card";

export { Badge } from "./Badge";
export type { BadgeProps } from "./Badge";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "./Modal";
export type { ModalProps, ModalHeaderProps } from "./Modal";

export { Tooltip } from "./Tooltip";
export type { TooltipProps } from "./Tooltip";

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonForm,
  SkeletonText,
} from "./Skeleton";
export type {
  SkeletonProps,
  SkeletonCardProps,
  SkeletonTableProps,
  SkeletonListProps,
  SkeletonFormProps,
  SkeletonTextProps,
} from "./Skeleton";
