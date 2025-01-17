import { BigNumber } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import {
  BaseTransactionResult,
  GnosisSafeContract,
  SafeTransaction,
  SafeTransactionData,
  SafeVersion
} from '@gnosis.pm/safe-core-sdk-types'
import { GnosisSafe as GnosisSafe_V1_1_1 } from '../../../typechain/src/ethers-v5/v1.1.1/GnosisSafe'
import { GnosisSafe as GnosisSafe_V1_2_0 } from '../../../typechain/src/ethers-v5/v1.2.0/GnosisSafe'
import {
  GnosisSafe as GnosisSafe_V1_3_0,
  GnosisSafeInterface
} from '../../../typechain/src/ethers-v5/v1.3.0/GnosisSafe'
import { EthersTransactionOptions } from '../../types'

export interface EthersTransactionResult extends BaseTransactionResult {
  transactionResponse: ContractTransaction
  options?: EthersTransactionOptions
}

function toTxResult(
  transactionResponse: ContractTransaction,
  options?: EthersTransactionOptions
): EthersTransactionResult {
  return {
    hash: transactionResponse.hash,
    options,
    transactionResponse
  }
}

abstract class GnosisSafeContractEthers implements GnosisSafeContract {
  constructor(public contract: GnosisSafe_V1_1_1 | GnosisSafe_V1_2_0 | GnosisSafe_V1_3_0) {}

  async getVersion(): Promise<SafeVersion> {
    return (await this.contract.VERSION()) as SafeVersion
  }

  getAddress(): string {
    return this.contract.address
  }

  async getNonce(): Promise<number> {
    return (await this.contract.nonce()).toNumber()
  }

  async getThreshold(): Promise<number> {
    return (await this.contract.getThreshold()).toNumber()
  }

  async getOwners(): Promise<string[]> {
    return this.contract.getOwners()
  }

  async isOwner(address: string): Promise<boolean> {
    return this.contract.isOwner(address)
  }

  async getTransactionHash(safeTransactionData: SafeTransactionData): Promise<string> {
    return this.contract.getTransactionHash(
      safeTransactionData.to,
      safeTransactionData.value,
      safeTransactionData.data,
      safeTransactionData.operation,
      safeTransactionData.safeTxGas,
      safeTransactionData.baseGas,
      safeTransactionData.gasPrice,
      safeTransactionData.gasToken,
      safeTransactionData.refundReceiver,
      safeTransactionData.nonce
    )
  }

  async approvedHashes(ownerAddress: string, hash: string): Promise<BigNumber> {
    return this.contract.approvedHashes(ownerAddress, hash)
  }

  async approveHash(
    hash: string,
    options?: EthersTransactionOptions
  ): Promise<EthersTransactionResult> {
    if (options && !options.gasLimit) {
      options.gasLimit = await this.estimateGas('approveHash', [hash], { ...options })
    }
    const txResponse = await this.contract.approveHash(hash, options)
    return toTxResult(txResponse, options)
  }

  abstract getModules(): Promise<string[]>

  abstract isModuleEnabled(moduleAddress: string): Promise<boolean>

  async execTransaction(
    safeTransaction: SafeTransaction,
    options?: EthersTransactionOptions
  ): Promise<EthersTransactionResult> {
    if (options && !options.gasLimit) {
      options.gasLimit = await this.estimateGas(
        'execTransaction',
        [
          safeTransaction.data.to,
          safeTransaction.data.value,
          safeTransaction.data.data,
          safeTransaction.data.operation,
          safeTransaction.data.safeTxGas,
          safeTransaction.data.baseGas,
          safeTransaction.data.gasPrice,
          safeTransaction.data.gasToken,
          safeTransaction.data.refundReceiver,
          safeTransaction.encodedSignatures()
        ],
        {
          ...options
        }
      )
    }
    const txResponse = await this.contract.execTransaction(
      safeTransaction.data.to,
      safeTransaction.data.value,
      safeTransaction.data.data,
      safeTransaction.data.operation,
      safeTransaction.data.safeTxGas,
      safeTransaction.data.baseGas,
      safeTransaction.data.gasPrice,
      safeTransaction.data.gasToken,
      safeTransaction.data.refundReceiver,
      safeTransaction.encodedSignatures(),
      options
    )
    return toTxResult(txResponse, options)
  }

  encode: GnosisSafeInterface['encodeFunctionData'] = (methodName: any, params: any): string => {
    return this.contract.interface.encodeFunctionData(methodName, params)
  }

  async estimateGas(
    methodName: string,
    params: any[],
    options: EthersTransactionOptions
  ): Promise<number> {
    return (await (this.contract.estimateGas as any)[methodName](...params, options)).toNumber()
  }
}

export default GnosisSafeContractEthers
