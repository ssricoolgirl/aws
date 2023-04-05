import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { IRepository, Repository, TagMutability } from 'aws-cdk-lib/aws-ecr'
import { AccountPrincipal, ArnPrincipal } from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { APP_NAME, SDLCAccounts, WORKLOAD_INFO } from '../config/environments'

export class CicdSetupStack extends Stack {
  public readonly ecrRepo: IRepository

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // If you deploy multiple services from this repo, you will need to make an ECR repository
    // specific to each service, for example:
    // repositoryName: `${APP_NAME}-something`,
    // Refer to the ECS service naming ADR for more information:
    // https://ghe.siriusxm.com/pages/platform-common/common-documentation/adrs/decisions/0039-aws-service-naming-convention/
    this.ecrRepo = new Repository(this, 'Repo', {
      repositoryName: APP_NAME,
      imageTagMutability: TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY, // perhaps not for production use
    })

    this.ecrRepo.grantPullPush(new ArnPrincipal(WORKLOAD_INFO.githubActions.actionRoleArn))
    SDLCAccounts.forEach(account => this.ecrRepo.grantPull(new AccountPrincipal(account.id))) // NOT sandboxes or CICD account
  }
}
