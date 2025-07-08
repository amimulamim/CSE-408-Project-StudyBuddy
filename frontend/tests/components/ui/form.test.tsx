import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Test component that uses the form components
function TestFormComponent() {
  const form = useForm({
    defaultValues: {
      username: '',
    },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

// Test component for error state
function TestFormWithError() {
  const form = useForm({
    defaultValues: {
      email: '',
    },
  });

  // Set error after component mounts to avoid infinite re-renders
  useEffect(() => {
    form.setError('email', {
      type: 'manual',
      message: 'Email is required',
    });
  }, [form]);

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter email" {...field} />
              </FormControl>
              <FormDescription>
                Your email address.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

// Alternative test component using validation rules
function TestFormWithValidation() {
  const form = useForm({
    defaultValues: {
      email: '',
    },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="email"
          rules={{ required: 'Email is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter email" {...field} />
              </FormControl>
              <FormDescription>
                Your email address.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

test('renders form item with proper structure', () => {
  render(<TestFormComponent />);
  
  expect(screen.getByText('Username')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  expect(screen.getByText('This is your public display name.')).toBeInTheDocument();
});

test('renders form label with proper attributes', () => {
  render(<TestFormComponent />);
  
  const label = screen.getByText('Username');
  expect(label).toBeInTheDocument();
  expect(label).toHaveAttribute('for');
});

test('applies error styling when field has error', async () => {
  render(<TestFormWithError />);
  
  // Wait for the error to be set
  await screen.findByText('Email is required');
  
  const label = screen.getByText('Email');
  expect(label).toHaveClass('text-destructive');
});

test('renders form control with accessibility attributes', () => {
  render(<TestFormComponent />);
  
  const input = screen.getByPlaceholderText('Enter username');
  expect(input).toHaveAttribute('id');
  expect(input).toHaveAttribute('aria-describedby');
});

test('sets aria-invalid when field has error', async () => {
  render(<TestFormWithError />);
  
  // Wait for the error to be set
  await screen.findByText('Email is required');
  
  const input = screen.getByPlaceholderText('Enter email');
  expect(input).toHaveAttribute('aria-invalid', 'true');
});

test('renders form description with id', () => {
  render(<TestFormComponent />);
  
  const description = screen.getByText('This is your public display name.');
  expect(description).toBeInTheDocument();
  expect(description).toHaveAttribute('id');
});

test('does not render error message when no error', () => {
  render(<TestFormComponent />);
  
  expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
});

test('renders error message when field has error', async () => {
  render(<TestFormWithError />);
  
  const errorMessage = await screen.findByText('Email is required');
  expect(errorMessage).toBeInTheDocument();
  expect(errorMessage).toHaveClass('text-destructive');
});