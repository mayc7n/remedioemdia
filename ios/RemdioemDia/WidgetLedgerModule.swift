import Foundation
import React

@objc(RemedioWidgetLedger)
final class RemedioWidgetLedger: NSObject {
  private let groupIdentifier = "group.com.mayc7n.remedioemdia"
  private let key = "remedio-em-dia-widget-ledger-v1"

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(gravar:resolver:rejecter:)
  func gravar(_ payload: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let data = payload.data(using: .utf8), let entrada = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let ocorrenciaId = entrada["ocorrenciaId"] as? String, !ocorrenciaId.isEmpty,
          let acao = entrada["acao"] as? String, acao == "taken" || acao == "snoozed" else {
      resolve(false)
      return
    }

    let defaults = UserDefaults(suiteName: groupIdentifier)
    var acoes = defaults?.array(forKey: key) as? [[String: Any]] ?? []
    guard !acoes.contains(where: { ($0["ocorrenciaId"] as? String) == ocorrenciaId }) else {
      resolve(false)
      return
    }
    acoes.append(entrada)
    defaults?.set(acoes, forKey: key)
    resolve(true)
  }

  @objc(lerEAceitar:rejecter:)
  func lerEAceitar(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let defaults = UserDefaults(suiteName: groupIdentifier)
    let acoes = defaults?.array(forKey: key) as? [[String: Any]] ?? []
    defaults?.removeObject(forKey: key)
    resolve(acoes)
  }
}
