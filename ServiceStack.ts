import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import { Repository } from 'aws-cdk-lib/aws-ecr'
import { Cluster, EcrImage, FargateTaskDefinition, LogDriver, Protocol } from 'aws-cdk-lib/aws-ecs'
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns'
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { ManagedPolicy, PermissionsBoundary } from 'aws-cdk-lib/aws-iam'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { Construct } from 'constructs'
import { APP_NAME, WORKLOAD_INFO } from '../config/environments'

export interface ServiceStackProps extends StackProps {
  vpcName: string
  clusterName: string
  imageTag: string
  dnsSuffix?: string
}

export class ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props)
    PermissionsBoundary.of(this).apply(ManagedPolicy.fromManagedPolicyName(this, 'PermissionBoundary', `appboundary-default-${Stack.of(this).account}-${Stack.of(this).region}`))

    const vpc = Vpc.fromLookup(this, 'vpc', {
      vpcName: props.vpcName,
    })

    const subnets = vpc.selectSubnets({ subnetGroupName: 'private' })

    const cluster = Cluster.fromClusterAttributes(this, `service-cluster`, {
      clusterName: props.clusterName,
      securityGroups: [],
      vpc: vpc,
    })

    const alb = new ApplicationLoadBalancer(this, 'alb', {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: subnets,
    })

    const ecrRepo = Repository.fromRepositoryArn(this, 'ecr-repo', `arn:aws:ecr:${this.region}:${WORKLOAD_INFO.awsAccounts.cicd?.id}:repository/${APP_NAME}`) // should match what's created in infrastructure/lib/CicdSetupStack.ts

    const taskDefinition = new FargateTaskDefinition(this, 'task-definition')
    const container = taskDefinition.addContainer('container', {
      image: EcrImage.fromEcrRepository(ecrRepo, props.imageTag),
      memoryLimitMiB: 512,
      logging: LogDriver.awsLogs({
        streamPrefix: 'logs',
      }),
    })

    container.addPortMappings({
      containerPort: 80,
      protocol: Protocol.TCP,
    })

    // Sandboxes don't have private DNS zones so skip custom private DNS if no suffix provided
    const zone = props.dnsSuffix
      ? HostedZone.fromLookup(this, 'hosted-zone', {
          domainName: props.dnsSuffix,
          privateZone: true,
        })
      : undefined

    const fargateAlbService = new ApplicationLoadBalancedFargateService(this, 'FargateService', {
      serviceName: APP_NAME,
      cluster: cluster,
      assignPublicIp: false,
      desiredCount: 1,
      taskDefinition: taskDefinition,
      loadBalancer: alb,
      publicLoadBalancer: false,
      domainName: zone ? `${APP_NAME}.${this.region}.${zone.zoneName}` : undefined,
      domainZone: zone,
      healthCheckGracePeriod: Duration.seconds(120),
    })
    fargateAlbService.targetGroup.configureHealthCheck({ path: '/actuator/health' })

    ecrRepo.grantPull(fargateAlbService.service.taskDefinition.taskRole)

    // This directly impacts the speed of deployment.  The default delay is 300 seconds (5 min),
    // which means the ALB target group wait for 5 min before removing the old task.
    fargateAlbService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '0')
  }
}
