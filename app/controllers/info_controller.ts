export default class InfoController {
  /**
   * @openingHours
   * @summary Get opening hours for canteen and cafe
   * @description Retrieves the opening and closing times for the canteen and cafe.
   * @responseBody 200 - {"openingHours":{"canteen":{"openingTime":"string","closingTime":"string"},"cafe":{"openingTime":"string","closingTime":"string"}}}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async openingHours() {
    return {
      openingHours: {
        canteen: {
          openingTime: "10:30",
          closingTime: "16:00",
        },
        cafe: {
          openingTime: "08:00",
          closingTime: "15:30",
        },
      },
    };
  }
}
