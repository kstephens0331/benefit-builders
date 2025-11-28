# Premium Component Library Documentation

A comprehensive, production-ready component library built for the Benefits Builder SaaS application. Features dark mode support, smooth animations, and accessibility throughout.

## Table of Contents

- [Getting Started](#getting-started)
- [Design System](#design-system)
- [Components](#components)
- [Utilities](#utilities)
- [Theme System](#theme-system)

---

## Getting Started

### Installation

All components are already installed and ready to use. Simply import from `@/components/ui`:

```tsx
import { Button, Card, Badge } from "@/components/ui";
```

### Basic Example

```tsx
export default function MyPage() {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>Get started with our components</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="primary" size="lg">
          Click Me
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Design System

### Color Palette

The design system uses a semantic color palette optimized for both light and dark modes:

- **Primary**: Blue tones (main brand color) - `primary-50` to `primary-950`
- **Accent**: Purple tones (secondary brand) - `accent-50` to `accent-900`
- **Success**: Green tones - `success-50` to `success-700`
- **Warning**: Yellow tones - `warning-50` to `warning-700`
- **Error**: Red tones - `error-50` to `error-700`
- **Neutral**: Gray scale - `neutral-50` to `neutral-950`

### Animations

15+ custom animations available:

- `animate-fade-in` - Smooth fade entrance
- `animate-slide-in-up` / `down` / `left` / `right` - Directional slides
- `animate-scale-in` - Scale up entrance
- `animate-bounce-in` - Bouncy entrance
- `animate-shimmer` - Loading shimmer effect
- `animate-pulse-slow` - Subtle pulse

### Typography Scale

```tsx
text-xs   // 0.75rem
text-sm   // 0.875rem
text-base // 1rem
text-lg   // 1.125rem
text-xl   // 1.25rem
text-2xl  // 1.5rem
text-3xl  // 1.875rem
text-4xl  // 2.25rem
```

---

## Components

### Button

Versatile button component with multiple variants and states.

**Props:**
- `variant`: `"primary" | "secondary" | "outline" | "ghost" | "danger" | "success"` (default: `"primary"`)
- `size`: `"xs" | "sm" | "md" | "lg" | "xl"` (default: `"md"`)
- `loading`: `boolean` - Shows loading spinner
- `icon`: `ReactNode` - Optional icon
- `iconPosition`: `"left" | "right"` (default: `"left"`)
- `fullWidth`: `boolean` - Makes button full width

**Examples:**

```tsx
// Primary button
<Button variant="primary" size="lg">
  Save Changes
</Button>

// With loading state
<Button variant="primary" loading={isSubmitting}>
  Submit Form
</Button>

// With icon
<Button variant="secondary" icon={<PlusIcon />}>
  Add Item
</Button>

// Danger action
<Button variant="danger" onClick={handleDelete}>
  Delete Account
</Button>
```

---

### Card

Flexible container component with header, content, and footer sections.

**Components:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title heading
- `CardDescription` - Subtitle text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Props (Card):**
- `variant`: `"default" | "elevated" | "outlined" | "ghost"` (default: `"default"`)
- `interactive`: `boolean` - Adds hover effects
- `padding`: `"none" | "sm" | "md" | "lg"` (default: `"md"`)

**Examples:**

```tsx
// Basic card
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Statistics</CardTitle>
    <CardDescription>Overview of key metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Your content here</p>
  </CardContent>
  <CardFooter>
    <Button>View More</Button>
  </CardFooter>
</Card>

// Interactive clickable card
<Card variant="elevated" interactive>
  <CardContent padding="lg">
    <h3>Click me!</h3>
  </CardContent>
</Card>
```

---

### Badge

Status indicator component for labels and tags.

**Props:**
- `variant`: `"default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"`
- `size`: `"sm" | "md" | "lg"` (default: `"md"`)
- `dot`: `boolean` - Adds animated dot indicator
- `outline`: `boolean` - Uses outline style
- `rounded`: `boolean` - Makes badge fully rounded

**Examples:**

```tsx
// Status badges
<Badge variant="success" dot>Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>

// Outline style
<Badge variant="primary" outline>Pro</Badge>

// With sizes
<Badge variant="info" size="sm">New</Badge>
<Badge variant="secondary" size="lg">Featured</Badge>
```

---

### Input

Form input component with validation states and helper text.

**Props:**
- `label`: `string` - Input label
- `helperText`: `string` - Helper text below input
- `error`: `string` - Error message (sets error state)
- `success`: `string` - Success message (sets success state)
- `leftIcon`: `ReactNode` - Icon on left side
- `rightIcon`: `ReactNode` - Icon on right side
- `variant`: `"default" | "filled" | "outlined"` (default: `"default"`)
- `inputSize`: `"sm" | "md" | "lg"` (default: `"md"`)

**Examples:**

```tsx
// Basic input
<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  helperText="We'll never share your email"
/>

// With validation
<Input
  label="Password"
  type="password"
  error={errors.password}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

// With success state
<Input
  label="Username"
  success="Username is available!"
  leftIcon={<CheckIcon />}
/>

// Different variants
<Input variant="filled" label="Search" />
<Input variant="outlined" label="Name" />
```

---

### Modal

Animated modal dialog with backdrop and keyboard navigation.

**Components:**
- `Modal` - Container
- `ModalHeader` - Header with optional close button
- `ModalTitle` - Title
- `ModalBody` - Content area
- `ModalFooter` - Footer with actions

**Props (Modal):**
- `isOpen`: `boolean` - Controls visibility
- `onClose`: `() => void` - Close handler
- `size`: `"sm" | "md" | "lg" | "xl" | "full"` (default: `"md"`)
- `closeOnBackdrop`: `boolean` - Close on backdrop click (default: `true`)
- `closeOnEsc`: `boolean` - Close on ESC key (default: `true`)

**Examples:**

```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="lg"
>
  <ModalHeader onClose={() => setIsOpen(false)}>
    <ModalTitle>Confirm Action</ModalTitle>
  </ModalHeader>
  <ModalBody>
    Are you sure you want to proceed?
  </ModalBody>
  <ModalFooter>
    <Button onClick={handleConfirm}>Confirm</Button>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
  </ModalFooter>
</Modal>
```

---

### Tooltip

Contextual tooltip with multiple positioning options.

**Props:**
- `content`: `ReactNode` - Tooltip content
- `position`: `"top" | "bottom" | "left" | "right"` (default: `"top"`)
- `delay`: `number` - Show delay in ms (default: `200`)
- `disabled`: `boolean` - Disable tooltip

**Examples:**

```tsx
<Tooltip content="Click to edit" position="top">
  <Button variant="ghost">Edit</Button>
</Tooltip>

<Tooltip
  content="This action is currently unavailable"
  position="bottom"
  delay={500}
>
  <Button disabled>Submit</Button>
</Tooltip>
```

---

### Skeleton

Loading placeholder components with shimmer animation.

**Components:**
- `Skeleton` - Base skeleton
- `SkeletonCard` - Card layout
- `SkeletonTable` - Table layout
- `SkeletonList` - List layout
- `SkeletonForm` - Form layout
- `SkeletonText` - Text lines

**Props (Skeleton):**
- `variant`: `"rectangular" | "circular" | "text"` (default: `"rectangular"`)
- `animation`: `"pulse" | "shimmer" | "none"` (default: `"shimmer"`)

**Examples:**

```tsx
// Loading state
{loading ? (
  <SkeletonCard showImage lines={3} />
) : (
  <Card>...</Card>
)}

// Custom skeleton
<Skeleton className="h-12 w-full mb-4" />
<Skeleton variant="circular" className="h-16 w-16" />

// Table placeholder
<SkeletonTable rows={5} columns={4} />

// List placeholder
<SkeletonList items={3} showAvatar />
```

---

## Utilities

### cn() - ClassName Merger

Utility function to merge Tailwind classes with conditional logic.

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  variant === "primary" && "primary-styles",
  className
)} />
```

### formatCurrency()

Format numbers as currency.

```tsx
import { formatCurrency } from "@/lib/utils";

formatCurrency(1234.56) // "$1,234.56"
```

### formatDate()

Format dates consistently.

```tsx
import { formatDate } from "@/lib/utils";

formatDate(new Date()) // "Nov 25, 2024"
```

---

## Theme System

### Dark Mode

The application includes a complete dark mode implementation.

**ThemeProvider**

Wrap your app with the theme provider:

```tsx
import { ThemeProvider } from "@/components/ThemeProvider";

<ThemeProvider>
  {children}
</ThemeProvider>
```

**useTheme Hook**

Access and control theme:

```tsx
import { useTheme } from "@/components/ThemeProvider";

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </button>
  );
}
```

**ThemeToggle Component**

Pre-built theme toggle button:

```tsx
import { ThemeToggle } from "@/components/ThemeToggle";

<ThemeToggle />
```

### Dark Mode Classes

All components support dark mode through Tailwind's dark variant:

```tsx
<div className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
  Content
</div>
```

---

## Best Practices

### Performance

1. **Use Skeleton loaders** for better perceived performance
2. **Lazy load heavy components** with React.lazy()
3. **Memoize expensive computations** with useMemo()

### Accessibility

1. **Always provide labels** for form inputs
2. **Use semantic HTML** where possible
3. **Test keyboard navigation** in modals and forms
4. **Provide ARIA labels** for icon-only buttons

### Consistency

1. **Use design tokens** from Tailwind config
2. **Follow component patterns** shown in examples
3. **Maintain spacing** with consistent gap/padding values
4. **Keep animations subtle** - prefer micro-interactions

---

## Examples

### Dashboard Card

```tsx
<Card variant="elevated" interactive className="border-l-4 border-primary-500">
  <CardContent padding="lg">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Total Revenue
        </div>
        <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
          $52,340
        </div>
      </div>
      <Badge variant="success" dot>Active</Badge>
    </div>
  </CardContent>
</Card>
```

### Form with Validation

```tsx
<form onSubmit={handleSubmit}>
  <Input
    label="Company Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    error={errors.name}
    required
  />

  <Input
    label="Email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    success={emailValid && "Email looks good!"}
    helperText="We'll send updates to this address"
  />

  <Button
    type="submit"
    variant="primary"
    fullWidth
    loading={isSubmitting}
  >
    Create Company
  </Button>
</form>
```

---

## Support

For issues or questions about the component library:

1. Check this documentation first
2. Review component source code in `src/components/ui/`
3. Look at usage examples in `src/app/dashboard/page.tsx`

---

**Built with ❤️ for Benefits Builder**
