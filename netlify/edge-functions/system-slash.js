export default async function systemSlash(request, context) {
  const url = new URL(request.url);

  if (url.pathname === "/sistema") {
    url.pathname = "/sistema/";
    return Response.redirect(url, 308);
  }

  return context.next();
}

export const config = {
  path: ["/sistema", "/sistema/"],
  onError: "bypass",
};
