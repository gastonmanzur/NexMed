import { SellerProfileModel } from "../models/seller-profile.model.js";
import { SellerClientModel } from "../models/seller-client.model.js";
import { SellerCommissionModel } from "../models/seller-commission.model.js";
import { SellerSettlementModel } from "../models/seller-settlement.model.js";

export class SalesRepository {
  profiles = SellerProfileModel;
  clients = SellerClientModel;
  commissions = SellerCommissionModel;
  settlements = SellerSettlementModel;
}
