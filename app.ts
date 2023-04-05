#!/usr/bin/env node

import 'source-map-support/register'
import { App, Stage, StageProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { CicdSetupStack } from '../lib/CicdSetupStack'
import { ServiceStack } from '../lib/ServiceStack'
import { APP_NAME, IMAGE_TAG, SDLCAccounts, TargetRegions, WORKLOAD_INFO, WORKLOAD_NAME } from '../config/environments'
import { MyPolicyS3Read } from "../lib/S3bucketReadPolicyIamRole"
import { S3FullReadAccessPermissions } from '../lib/s3access-permissionswithprefix'
import { GrantAccessRole } from '../lib/writepermissionstos3bucket'
import { s3sslstack } from '../lib/ssls3permissions'
import { ServerSideEncryption } from '../lib/Serverside-encryption'
import { S3SecurityMonitoringStack } from '../lib/Securityalert'
//const app = new cdk.App();
const app = new App()

interface DeploymentStageProps extends StageProps {
  stage: string
  dnsSuffix?: string
}

// Set up CI/CD prerequisites (e.g., per-region ECR repositories) first

class CicdSetupStage extends Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props)
    new CicdSetupStack(this, 'CicdSetup', { stackName: `cicd-${APP_NAME}-setup` })
  }
}

TargetRegions.forEach(
  region =>
    new CicdSetupStage(app, `cicd-${region}`, {
      env: { account: WORKLOAD_INFO.awsAccounts.cicd?.id, region },
    })
)

// Define per-environment deployment stages

class DeploymentStage extends Stage {
  constructor(scope: Construct, id: string, props: DeploymentStageProps) {
    super(scope, id, props)
    new ServiceStack(this, 'App', {
      stackName: `app-${APP_NAME}-service`,
      clusterName: 'primary-fargate',
      dnsSuffix: props.dnsSuffix,
      imageTag: IMAGE_TAG!,
      vpcName: 'enterprise',
    })

new S3FullReadAccessPermissions(this, "S3FullReadAccessPermissions", {
  stackName: `app-${APP_NAME}-service-1`,
  bucketName: "sxmsmx-test-bucket-test1",//change bucket name every time before deloyment
  roleName: "app-sxmsmx-test-bucket-role",//should start with "app-"
  policyName: "sxmsmx-test-bucket-policy", 
  prefix:"sxmsmx-test-prefix",
})

new ServerSideEncryption(this, "ServerEncryptionStack", {
  stackName: `app-${APP_NAME}-service-4`,
  bucketName: "sxmsmx-test-Encryption-bucket-1",
  roleName: "app-sxmsmx-test-bucket-role",
  policyName: "my-policy",
});

new S3SecurityMonitoringStack(this,"notifocationAlertStack", {
  stackName: `app-${APP_NAME}-service-5`,
  bucketName: "sxmsmx-test-bucket-3",
  roleName: "app-sxmsmx-test-bucket-role",
  policyName: "sxmsmx-test-bucket-policy",
  alertTopic: "alert",
  
})

new MyPolicyS3Read(this, "Policyread",{

  stackName: `app-${APP_NAME}-service-6`,
  bucketName:"sxmsmx-test-bucket-6",
  roleName: "app-sxmsmx-test-bucket-role",
  policyName: "sxmsmx-test-bucket-policy-3"

})


new s3sslstack(this,"ssls3policy",{
  stackName: `app-${APP_NAME}-service-2`,
  bucketName: "sxmsmx-test-bucket-2",
  roleName: "app-sxmsmx-test-bucket-role-2",
  policyName: "sxmsmx-test-bucket-policy-2",
})
  
new GrantAccessRole(this, "S3writepermissionStack", {
  stackName: `app-${APP_NAME}-service-3`,
  bucketName: "sxmsmx-test-bucket-role-testing1",
  roleName: "app-sxmsmx-test-bucket-roles-testing2",
  policyName: "sxmsmx-test-bucket-policies-testing2",
});



  }
}



SDLCAccounts.forEach(account =>
  TargetRegions.forEach(
    region =>
      new DeploymentStage(app, `${account.stage}-${region}`, {
        env: { account: account.id, region },
        stage: account.stage,
        dnsSuffix: account.privateDnsZoneName,
      })
  )
)

// Enable manual deployment to sandbox (if desired). Can be limited to a single region if desired.
TargetRegions.forEach(
  region =>
    new DeploymentStage(app, `sandbox-${region}`, {
      env: { account: WORKLOAD_INFO.awsAccounts['sandbox-1']?.id, region },
      stage: 'sandbox',
    })
)

new GrantAccessRole(app, "S3writepermissionStack", {
  stackName: `app-${APP_NAME}-service-3`,
  bucketName: "sxmsmx-test-bucket-role-testing1",
  roleName: "app-sxmsmx-test-bucket-roles-testing2",
  policyName: "sxmsmx-test-bucket-policies-testing2",
});
