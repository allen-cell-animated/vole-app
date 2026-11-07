export default class HttpClient {
  // fetch response.json() is a promise but we want return the json itself
  parseJSON(response: Response, _options: Parameters<typeof fetch>[1]): Promise<Response> {
    return response
      .json()
      .then((json) => ({
        ...response,
        locationHeader: response.headers.get("Location"),
        data: json || {
          data: [],
          total_count: 0,
        },
      }))
      .catch(() => ({
        ...response,
        data: {
          error: "unknown_error",
          message: "error in parsing response json",
          host: response.headers.get("Location"),
          time: new Date().toISOString(),
        },
      }));
  }

  getJSON(url: string, options: Parameters<typeof fetch>[1]): Promise<Response> {
    return fetch(url, options)
      .then((response) => {
        return this.parseJSON(response, options);
      })
      .then((response) => {
        if (response.ok) {
          return response;
        } else {
          // fetch will not automatically reject error status codes
          // however, we want to treat error status codes as failures
          // so we reject here
          return Promise.reject(response);
        }
      });
  }
}
