export default class UtilsService {
  /**
   *
   * @param name (string) Name of query parameter to search for
   * @param url (string) url string to search (if not provided, defaults to window url)
   * @returns {*} value of query parameter (URI decoded).
   * If query parameter not found, returns null.
   * If no value provided, returns empty string
   */
  static getParameterByName(name: string, url: string): string | null {
    if (!url) url = window.location.href;
    name = name.replace(/[[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  static intersects<T>(arr1: T[], arr2: T[]): boolean {
    if (!arr1 || !arr2) {
      return false;
    }

    let smallerArr: T[], largerArr: T[];
    if (arr1.length > arr2.length) {
      smallerArr = arr2;
      largerArr = arr1;
    } else {
      smallerArr = arr1;
      largerArr = arr2;
    }

    for (let i = 0; i < smallerArr.length; i++) {
      if (largerArr.indexOf(smallerArr[i]) > -1) {
        return false;
      }
    }

    return true;
  }
}
