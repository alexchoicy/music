<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoginRequestSchema } from "@music/api/dto/auth.dto"
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import { PropType } from "vue"
import { FormField } from "../ui/form"

const props = defineProps({
  onLogin: {
    type: Function as PropType<(username: string, password: string) => Promise<void>>,
    required: true,
  },
})

const formSchema = toTypedSchema(LoginRequestSchema);

const form = useForm({
  validationSchema: formSchema,
});

const onFormSubmit = form.handleSubmit(async (values) => {
  await props.onLogin(values.username, values.password);
})

</script>

<template>
  <Card class="w-full max-w-sm">
    <form @submit="onFormSubmit">
      <CardHeader>
        <CardTitle class="text-2xl">
          Login
        </CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <FormField v-slot="{ componentField }" name="username">
          <div class="grid gap-2">
            <Label for="username">Username</Label>
            <Input id="username" type="text" placeholder="Enter your username" v-bind="componentField" required />
          </div>
        </FormField>
        <FormField v-slot="{ componentField }" name="password">
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input id="password" type="password" v-bind="componentField" required />
          </div>
        </FormField>
      </CardContent>
      <CardFooter>
        <Button class="w-full">
          Sign in
        </Button>
      </CardFooter>
    </form>
  </Card>
</template>
