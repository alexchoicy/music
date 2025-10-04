export default defineEventHandler((event) => {
  const user = event.context.user;
  if (!user) {
    setResponseStatus(event, 401);
    return { authenticated: false };
  }
  return { authenticated: true, user };
});
