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
          openingTime: "pon.-czw. 7:30",
          closingTime: "18:00, pt. 7:30 - 16:00",
        },
        cafe: {
          openingTime: "pon.-czw. 10:30",
          closingTime: "17:00, pt. 10:30 - 16:00",
        },
      },
    };
  }
}
