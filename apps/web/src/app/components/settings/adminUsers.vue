<script setup lang="ts">
  import { UserRolesSchema } from "@music/api/dto/auth.dto";
  import { createUserRequestSchema, type UsersInfoDTO } from "@music/api/dto/users.dto";
  import { toTypedSchema } from "@vee-validate/zod";
  import { User, UserPlus, ShieldUser, Trash, Pencil } from "lucide-vue-next";
  import { useForm } from "vee-validate";

  const users = useAPI<UsersInfoDTO[]>("/users");

  const formSchema = toTypedSchema(createUserRequestSchema);

  const form = useForm({
    validationSchema: formSchema,
  });

  const onFormSubmit = form.handleSubmit(async (values) => {
    await useNuxtApp().$backend("users", {
      method: "POST",
      body: values,
    });
    users.refresh();
  });

  function formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
        <CardDescription>Create new users</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit="onFormSubmit">
          <!-- I think the field thingy is not working properly with form right now -->
          <!-- no error message -->
          <FieldGroup>
            <FieldSet>
              <div class="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel for="username">Username</FieldLabel>
                  <FormField v-slot="{ componentField }" name="username">
                    <Input id="username" type="text" v-bind="componentField" required />
                  </FormField>
                </Field>
                <Field>
                  <FieldLabel for="displayName">Display Name</FieldLabel>
                  <FormField v-slot="{ componentField }" name="displayName">
                    <Input id="displayName" type="text" v-bind="componentField" required />
                  </FormField>
                </Field>
              </div>
              <Field>
                <FieldLabel for="password">Password</FieldLabel>
                <FormField v-slot="{ componentField }" name="password">
                  <Input id="password" type="password" v-bind="componentField" required />
                </FormField>
              </Field>
              <Field>
                <FieldLabel for="role">Role</FieldLabel>
                <FormField v-slot="{ componentField }" name="role">
                  <Select id="role" v-bind="componentField">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="options in UserRolesSchema.options" :key="options" :value="options">
                        {{ options }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </Field>
            </FieldSet>

            <Field orientation="horizontal">
              <Button type="submit">Submit</Button>
              <Button variant="outline" type="button">Cancel</Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardContent>
        <Item v-for="user in users.data.value" :key="user.id">
          <ItemMedia>
            <User v-if="user.role === 'user'" />
            <ShieldUser v-else-if="user.role === 'admin'" />
            <UserPlus v-else-if="user.role === 'uploader'" />
            <User v-else />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{{ user.displayname }} ({{ user.username }})</ItemTitle>
            <ItemDescription>
              Role: {{ user.role }} | Created At:
              {{ formatDate(user.createdAt) }}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <div class="grid grid-cols-2 gap-4">
              <Button variant="ghost" size="sm">
                <Pencil />
              </Button>
              <Button variant="ghost" size="sm">
                <Trash />
              </Button>
            </div>
          </ItemActions>
        </Item>
      </CardContent>
    </Card>
  </div>
</template>
